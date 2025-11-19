CLASS zcl_{{CUSTOMER}}_quote_dpc_ext DEFINITION
  PUBLIC
  INHERITING FROM zcl_{{CUSTOMER}}_quote_dpc
  CREATE PUBLIC .

  PUBLIC SECTION.

    METHODS /iwbep/if_mgw_appl_srv_runtime~create_entity
        REDEFINITION .
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS zcl_{{CUSTOMER}}_quote_dpc_ext IMPLEMENTATION.

  METHOD /iwbep/if_mgw_appl_srv_runtime~create_entity.
*----------------------------------------------------------------------*
* Data Provider Class Extension for Quote Creation
* Customer: {{CUSTOMER}}
* Generated: {{DATE}}
*----------------------------------------------------------------------*

    DATA: lv_entity_name   TYPE string,
          ls_request_data  TYPE zcl_{{CUSTOMER}}_quote_mpc=>ts_quote,
          lv_quote_number  TYPE vbeln,
          lt_messages      TYPE bapiret2_t,
          ls_message       TYPE bapiret2,
          lv_msg           TYPE string,

          " Custom fields
{{CUSTOM_DATA_DPC}}

          " Response entity
          ls_entity        TYPE zcl_{{CUSTOMER}}_quote_mpc=>ts_quote.

    " Get entity name
    lv_entity_name = io_tech_request_context->get_entity_type_name( ).

    CASE lv_entity_name.
      WHEN 'Quote'.

        " Read request payload
        io_data_provider->read_entry_data(
          IMPORTING
            es_data = ls_request_data ).

        " Validate required fields
        IF ls_request_data-customer_id IS INITIAL.
          " Raise exception for missing required field
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING
              textid            = /iwbep/cx_mgw_busi_exception=>business_error
              message           = 'Customer ID is required'
              message_container = io_message_container.
        ENDIF.

        IF ls_request_data-valid_until IS INITIAL.
          " Raise exception for missing required field
          RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
            EXPORTING
              textid            = /iwbep/cx_mgw_busi_exception=>business_error
              message           = 'Valid Until date is required'
              message_container = io_message_container.
        ENDIF.

{{CUSTOM_VALIDATION_DPC}}

        " Call function module to create quote
        TRY.
            CALL FUNCTION 'Z_CREATE_QUOTE_{{CUSTOMER}}'
              EXPORTING
                customer_id  = ls_request_data-customer_id
                quote_date   = ls_request_data-quote_date
                valid_until  = ls_request_data-valid_until
                sales_org    = ls_request_data-sales_org
                dist_channel = ls_request_data-dist_channel
                division     = ls_request_data-division
{{CUSTOM_FM_PARAMS_DPC}}
              IMPORTING
                quote_number = lv_quote_number
                messages     = lt_messages
              EXCEPTIONS
                error        = 1
                OTHERS       = 2.

            IF sy-subrc <> 0.
              " Get error messages from function module
              LOOP AT lt_messages INTO ls_message WHERE type CA 'EA'.
                lv_msg = |{ ls_message-message }|.
                EXIT.
              ENDLOOP.

              IF lv_msg IS INITIAL.
                lv_msg = 'Error creating quote - please check logs'.
              ENDIF.

              " Raise business exception
              RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
                EXPORTING
                  textid            = /iwbep/cx_mgw_busi_exception=>business_error
                  message           = lv_msg
                  message_container = io_message_container.
            ENDIF.

          CATCH cx_root INTO DATA(lx_error).
            " Handle unexpected errors
            RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
              EXPORTING
                textid            = /iwbep/cx_mgw_busi_exception=>business_error
                message           = lx_error->get_text( )
                message_container = io_message_container.
        ENDTRY.

        " Build response entity
        ls_entity-quote_number = lv_quote_number.
        ls_entity-customer_id  = ls_request_data-customer_id.
        ls_entity-quote_date   = ls_request_data-quote_date.
        ls_entity-valid_from   = ls_request_data-quote_date.
        ls_entity-valid_until  = ls_request_data-valid_until.
        ls_entity-sales_org    = ls_request_data-sales_org.
        ls_entity-dist_channel = ls_request_data-dist_channel.
        ls_entity-division     = ls_request_data-division.
        ls_entity-created_at   = sy-datum.
        ls_entity-created_by   = sy-uname.
        ls_entity-status       = 'A'.  " Active

{{CUSTOM_RESPONSE_DPC}}

        " Set response
        copy_data_to_ref(
          EXPORTING
            is_data = ls_entity
          CHANGING
            cr_data = er_entity ).

        " Add success message
        LOOP AT lt_messages INTO ls_message WHERE type = 'S'.
          io_message_container->add_message(
            iv_msg_type   = 'S'
            iv_msg_text   = ls_message-message
            iv_entity_type = lv_entity_name ).
        ENDLOOP.

      WHEN OTHERS.
        " Unknown entity
        super->/iwbep/if_mgw_appl_srv_runtime~create_entity(
          EXPORTING
            iv_entity_name          = iv_entity_name
            iv_entity_set_name      = iv_entity_set_name
            iv_source_name          = iv_source_name
            it_key_tab              = it_key_tab
            io_tech_request_context = io_tech_request_context
            it_navigation_path      = it_navigation_path
            io_data_provider        = io_data_provider
          IMPORTING
            er_entity               = er_entity ).
    ENDCASE.

  ENDMETHOD.

ENDCLASS.
